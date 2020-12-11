import { FastifyRequest } from 'fastify';
import { verifyMessage } from '@ethersproject/wallet';
import { arrayify } from '@ethersproject/bytes'
import { toUtf8Bytes } from '@ethersproject/strings'
import { Unauthorized, HttpError } from 'http-errors'
import Whitelist from '../db/Whitelist'
import Admin from '../db/Admin';
import { Params } from '../../lib/AbstractAction';

export interface AuthenticatedRequest extends FastifyRequest {
    publicKey: string
    admin: boolean
}

export default class Authenticator {
    /**
     * @property {HttpError} NOT_ALLOWED
     * 
     * @private
     */
    private NOT_ALLOWED: HttpError = new Unauthorized('Not allowed action!')

    /**
     * @param {Whitelist} whitelist 
     * @param {Admin} admin
     *  
     * @constructor
     */
    constructor(private whitelist: Whitelist, private admin: Admin) { }

    /**
     * Checks if the given public key is existing and if this account is allowed to execute the requested action
     * 
     * @method authenticate
     * 
     * @param {FastifyRequest} request - The fastify request object
     * @param {FastifyReply} reply - The fastify response object
     * 
     * @returns Promise<undefined>
     * 
     * @public
     */
    public async authenticate(request: FastifyRequest): Promise<undefined> {
        let message = (request.body as Params).message

        if (typeof message === 'object' && message != null) {
            message = toUtf8Bytes(JSON.stringify(message))
        } else {
            message = arrayify(message)
        }

        const publicKey = verifyMessage(
            message,
            (request.body as Params).signature
        )

        if (
            await this.hasPermission(
                request,
                publicKey
            )
        ) {
            (request as AuthenticatedRequest).publicKey = publicKey

            return
        } 

        throw this.NOT_ALLOWED
    }

    /**
     * Checks if the current requesting user has permissions
     * 
     * @method hasPermission
     * 
     * @param {FastifyRequest} request 
     * @param {string} publicKey
     * 
     * @returns {Promise<boolean>}
     * 
     * @private 
     */
    private async hasPermission(request: FastifyRequest, publicKey: string): Promise<boolean> {
        if (request.routerPath === '/whitelist' && await this.admin.isAdmin(publicKey)) {
            (request as AuthenticatedRequest).admin = true

            return true
        }

        // TODO: Fire only one SQL statement to check if the key exists and if the limit is reached
        if (
            request.routerPath !== '/whitelist' && 
            (
                (await this.whitelist.keyExists(publicKey) && !(await this.whitelist.limitReached(publicKey))) ||
                await this.admin.isAdmin(publicKey)
            )
        ) {
            (request as AuthenticatedRequest).admin = false

            return true
        }

        return false
    }
}